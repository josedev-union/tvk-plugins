require 'benchmark'
require 'thread'
require 'optparse'
require 'json'

options = {
  threads: 10,
  requests: 3,
  min_wait: 0.0,
  img: 'face-12kb',
  mode: 'ortho',
  frequency: nil,
  duration: nil,
}
OptionParser.new do |opts|
  opts.banner = "Usage: many-reqs.rb [options]"

  opts.on('-f', '--frequency REQ_PER_SEC', Float, 'Request frequency') { |v| options[:frequency] = v }
  opts.on('-d', '--duration DURATION', Float, 'Request frequency') { |v| options[:duration] = v }

  opts.on('-t', '--threads THREADS', Integer, 'Amount of threads') { |v| options[:threads] = v }
  opts.on('-r', '--requests REQUESTS', Integer, 'Amount of requests per thread') { |v| options[:requests] = v }
  opts.on('-w', '--wait WAIT', Float, 'Min wait per thread') { |v| options[:min_wait] = v }
  opts.on('-i', '--img IMAGE', String, 'image name eg. testface1.jpg') { |v| options[:img] = v }
  opts.on('-m', '--mode (ortho/cosmetic)', String, 'mode of simulation') { |v| options[:mode] = v }
end.parse!

unless options[:img].match(%r{\.(png|jpe?g)$})
  options[:img] += '.jpg'
end


class Executor
  def initialize(options)
    @options = options
    @benches = []
    @fail_benches = []
    @success_benches = []
    @mutex = Mutex.new
  end

  def run_all
    if self.constant_frequency?
      self.run_constant_frequency
    else
      self.run_with_workers
    end
  end

  def run_constant_frequency
    delay_per_request = 1.0/@options[:frequency]
    amount_of_requests = (@options[:duration] / delay_per_request).ceil.to_i
    threads = []
    @measure = Benchmark.measure do
      Thread.new do
        amount_of_requests.times do
          threads << Thread.new do
            do_request
          end
          sleep delay_per_request
        end
      end.join
      threads.each(&:join)
    end
  end

  def run_with_workers
    threads = []
    @measure = Benchmark.measure do
      @options[:threads].times do
        threads << Thread.new do
          @options[:requests].times do |i|
            m = do_request
            is_last_req = i == @options[:requests]-1
            to_sleep = @options[:min_wait] - m.real
            if !is_last_req && to_sleep > 0.0
              sleep(to_sleep)
            end
          end
        end
      end
      threads.each(&:join)
    end
  end

  def constant_frequency?
    !@options[:frequency].nil? && !@options[:duration].nil?
  end

  def print_results
    fails = @fail_benches.size
    successes = @success_benches.size
    count = @benches.size.to_f

    success_values = @success_benches.map(&:real)
    fail_values = @fail_benches.map(&:real)
    total = @measure.real
    puts "###################"
    puts "# ALL IN PARALLEL #"
    puts "###################"
    puts "Count: #{count.to_i}"
    puts "Sum: %.2f secs" % total
    puts "Avg: %.2f secs" % (total/count)
    puts ""
    puts "########################"
    puts "# INDIVIDUAL SUCCESSES #"
    puts "########################"
    puts "Count: #{successes.to_i} (%.1f%%)" % (successes.to_f/count*100.0)
    if successes.to_i > 0
      puts "Avg: %.2f secs" % (success_values.reduce(:+)/successes)
      puts "Max: %.2f secs" % success_values.max
      puts "Min: %.2f secs" % success_values.min
    end
    puts ""
    puts "####################"
    puts "# INDIVIDUAL FAILS #"
    puts "####################"
    puts "Count: #{fails.to_i} (%.1f%%)" % (fails.to_f/count*100.0)
    if fails.to_i > 0
      puts "Avg: %.2f secs" % (fail_values.reduce(:+)/fails)
      puts "Max: %.2f secs" % fail_values.max
      puts "Min: %.2f secs" % fail_values.min
    end
    puts ""
    puts "OPTS: #{@options}"
  end

  private
  def do_request
    result = nil
    m = Benchmark.measure do
      result = %x(./local.sh ./#{@options[:img]} #{@options[:mode]})
    end
    #puts "--->\n#{result}\n<---"
    failed = false
    begin
      obj = JSON.parse(result)
      failed = !obj['success']
    rescue
      failed = true
    end
    #puts "-->\nSUCCESS: #{obj['success']}\n<--"
    @mutex.synchronize do
      @benches << m
      if failed
        @fail_benches << m
      else
        @success_benches << m
      end
    end
    return m
  end
end

executor = Executor.new(options)
executor.run_all()
executor.print_results()
